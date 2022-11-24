import React, { useState } from "react";
import './App.css';


function App() {
  // Basic variables for connecting
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [visibleCount, setVisibleCount] = useState(1);

  // Module to connect to the API's
  const axios = require('axios');

  // Define all the variables for the graphics effects and validating
  const [isValidated, setIsValidated] = useState(false);
  const [loginSuccessful, setLoginSuccessful] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTaking, setIsTaking] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Define the dictionnary where the averages will be calculated
  const [isThereGrades, setIsThereGrades] = useState(false);
  const [realGrades, setRealGrades] = useState({});

  // Helper functions to get the username and password from inputs
  const handleUsernameChange = event => { setUsername(event.target.value); }
  const handlePasswordChange = event => { setPassword(event.target.value); }

  // Function to quickly get the calculated average
  const getAverage = ({ subjectCode, periodCode, classAverage }) => {
    if (periodCode in realGrades[subjectCode]) {
      if (!classAverage) {
        return realGrades[subjectCode][periodCode].average;
      } else {
        return realGrades[subjectCode][periodCode].averageClass;
      }
    } else {
      return -1;
    }
  }

  // Function to get the grades from the EcoleDirecte's API
  const getData = async() => {
    // Set the current state to loading
    setIsLoading(true);

    // The URL to get the session token from EcoleDirecte's API
    const loginURL = "https://api.ecoledirecte.com/v3/login.awp?v=4.24.1";
    
    // Required payload
    const loginPayload = {
      "uuid": "",
      "identifiant": username,
      "motdepasse": password,
      "isReLogin": false
    }

    // Set the current state to connecting
    setIsConnecting(true);
    // Sends the request to the API and loading the response
    axios.post(loginURL, "data=" + JSON.stringify(loginPayload)).then((loginResponse) => {
      // Set the current state to not connecting
      setIsConnecting(false);

      // Checking if the request was successful
      const loginResponseCode = loginResponse.data.code;
      if (loginResponseCode !== 200) {
        // If the request is not successful we stop the login process
        setIsValidated(false);
        setLoginSuccessful(false);
        setIsLoading(false);
        return 0;
      }
      // If the request is successful we set the state true
      setLoginSuccessful(true);
      
      // Getting the session token and ID
      const studentToken = loginResponse.data.token;
      const studentID = loginResponse.data.data.accounts[0].id;

      var studentFullName = loginResponse.data.data.accounts[0].prenom;
      if (loginResponse.data.data.accounts[0].particule !== "") { studentFullName += " " + loginResponse.data.data.accounts[0].particule;}
      studentFullName += " " + loginResponse.data.data.accounts[0].nom;

      // The URL to get the grades from EcoleDirecte's API
      const gradesURL = "https://api.ecoledirecte.com/v3/eleves/" + studentID + "/notes.awp?verbe=get&v=4.24.1";

      // Required payload and headers
      const gradesPayload = {
        "anneeScolaire": ""
      }
      const gradesHeaders = {
        "x-token": studentToken
      }

      // Set the current state to taking
      setIsTaking(true);
      // Sends the request to the API and loading the response
      axios.post(gradesURL, "data=" + JSON.stringify(gradesPayload), { headers: gradesHeaders }).then((gradesResponse) => {
        setIsTaking(false);
        // Checking if the request was successful
        const gradesResponseCode = gradesResponse.data.code;
        if (gradesResponseCode !== 200) {
          // If the request is not successful we stop the taking process
          setIsLoading(false);
          return 0;
        }

        // If the request was successful we calculate the averages
        calculateAverages(gradesResponse.data);

        // Add to the count
        const apiURL = "https://moyennesed.my.to:777/add_count";
        const apiPayload = {
          "username": studentFullName
        };
        const apiHeaders = {};
        axios.post(apiURL, apiPayload, { headers: apiHeaders }).then((apiResponse) => {
          // Verify that count has been updated
          var count = 1;
          if (apiResponse.status === 200) {
            count = apiResponse.data.count;
          }
          incrCountRec({ i: 0, count: count });
        });
      });
    });
  }

  // Function that calculates the averages from EcoleDirecte's API response
  const calculateAverages = ({ data }) => {
    // Checking if there are any grades
    if (!(data.notes.length === 0)) { setIsThereGrades(true); }
    else { setIsThereGrades(false); }

    // Initializing the temporary dictionnary to put the grades into
    var grades = {
      "GENERAL": {}
    };
    
    // Addition of the grades
    for (var grade of data.notes) {
      var subjectCode = grade.codeMatiere;
      var periodCode = grade.codePeriode;
      
      // Create the suject's object in the grades dictionnary
      if (!(subjectCode in grades)) {
        grades[subjectCode] = {};
      }

      // Create the subject's object in the right period in the grades dictionnary
      if (!(periodCode in grades[subjectCode])) {
        grades[subjectCode][periodCode] = {
          "total": 0.0,
          "coef": 0.0,
          "average": 0.0,

          "totalClass": 0.0,
          "coefClass": 0.0,
          "averageClass": 0.0
        }
        grades[subjectCode].completeName = grade.libelleMatiere;
      }

      // Get the grade and coefficient
      var value = parseFloat(grade.valeur.replace(",", "."));
      var classValue = parseFloat(grade.moyenneClasse.replace(",", "."));
      var valueOn = parseFloat(grade.noteSur.replace(",", "."));

      

      // Set the coefficient to 1 if not provided and 0 if grade is not significative
      var coef = parseFloat(grade.coef);
      if (grade.nonSignificatif) { coef = 0.0; }
      else if (coef === 0.0) { coef = 1.0; }

      // Check if the grade is a value and not "Abs"
      if (!isNaN(value)) {
        // Calculate the value of the grade / 20
        var realGrade = value / valueOn * 20.0;

        // Add the value * coef to the correct object
        grades[subjectCode][periodCode].total += realGrade * coef;
        grades[subjectCode][periodCode].coef += coef;
      }
      // Do the same for the average class grade
      if (!isNaN(classValue)) {
        var realClassGrade = classValue / valueOn * 20.0;
        grades[subjectCode][periodCode].totalClass += realClassGrade * coef;
        grades[subjectCode][periodCode].coefClass += coef;
      }
    }

    // Calculation of the subject's averages 
    for (const [subjectCode, subject] of Object.entries(grades)) {
      // Check that the subject isn't the GENERAL average
      if (subjectCode !== "GENERAL") {
        for (const [periodCode, period] of Object.entries(subject)) {
          if (periodCode !== "completeName") {
            // Calculate the average
            coef = period.coef;
            var average;
            if (coef === 0.0) { average = 0.0; }
            else { average = period.total / coef; }
            // Rounding it to 2 decimals
            average = Math.round(average * 100) / 100.0;
            period.average = average;

            // Do the same for average class grade
            var classCoef = period.coefClass;
            var classAverage;
            if (classCoef === 0.0) { classAverage = 0.0; }
            else { classAverage = period.totalClass / classCoef; }
            classAverage = Math.round(classAverage * 100) / 100.0;
            period.averageClass = classAverage;
            
            // Add the period to the GENERAL average if not already there
            if (!(periodCode in grades.GENERAL)) {
              grades.GENERAL[periodCode] = {
                "total": 0.0,
                "coef": 0.0,
                "average": 0.0,

                "totalClass": 0.0,
                "coefClass": 0.0,
                "averageClass": 0.0
              };
              grades.GENERAL.completeName = "MOYENNE GÉNÉRALE";
            }
            
            // Add the average and coefficient
            grades.GENERAL[periodCode].total += average;
            grades.GENERAL[periodCode].totalClass += classAverage;
            
            if (coef !== 0.0) { grades.GENERAL[periodCode].coef += 1.0; }
            if (classCoef !== 0.0) { grades.GENERAL[periodCode].coefClass += 1.0; }
          }
        }
      }
    }

    // Calculation of the GENERAL average
    for (const [periodCode, period] of Object.entries(grades.GENERAL)) {
      if (periodCode !== "completeName") {
        // Calculate the average of the right period
        average = period.total / period.coef;
        // Rounding the average to 2 decimals
        average = Math.round(average * 100) / 100.0;
        period.average = average;
        
        // Do the same for class average
        classAverage = period.totalClass / period.coefClass;
        classAverage = Math.round(classAverage * 100) / 100.0;
        period.averageClass = classAverage;
      }
    }
    
    // Set the finals averages and stop the loading process
    setRealGrades(grades);
    setIsLoading(false);
  }

  // Function to submit the login
  const submit = async() => {
    // Only login if not loading
    if (!isLoading) {
      // Set the current state to validated and getting the grades from EcoleDirecte's API
      setVisibleCount(1);
      setIsValidated(true);
      getData();
    }
  }

  // Function to animate the count
  const incrCountRec = ({ i, count }) => {
    setVisibleCount(i);
    if (i < count) {
      setTimeout(() => {
        incrCountRec({ i: i + 1, count: count });
      }, 15);
    }
  }
  
  return (
    <div className="App">
      <div className="box">
        <h1>Moyennes École Directe <a className="version">v2.1</a></h1>
        <p>Entrez votre identifiant et mot de passe ED</p>
        <a>{loginSuccessful ? "" : "Identifiant ou mot de passe incorrect"}</a>
        <input onChange={handleUsernameChange} type="text" placeholder="Identifiant"></input>
        <input onChange={handlePasswordChange} type="password" placeholder="Mot de passe"></input>
        {(() => {
          var text = "";
          if (isConnecting) { text = "Connexion..."; }
          else if (isTaking) { text = "Récupération des notes..."; }
          else if (loginSuccessful && isValidated) { text = "Visite " + visibleCount; }
          else { text = "Valider" }
          return <button onClick={submit}>{text}</button>
        })()}
      </div>

      {(() => {
        // Displaying the averages if calculated
        if (isValidated && loginSuccessful && !isLoading) {
          if (isThereGrades) {
            // Define the object where all the HTML code for the
            // averages will be put
            var averages = [];

            // Loop through the averages to add them to the list
            for (const [subjectCode, subject] of Object.entries(realGrades)) {
              averages.push(
                <div className="box">
                  <h1>{subject.completeName}</h1>
                  {(() => {
                    var subjectAverages = [];
                    // Push HTML code for every period
                    for (let i = 1; i <= 3; i++) {
                      var average = getAverage({ subjectCode: subjectCode, periodCode: "A00" + i });
                      var classAverage = getAverage({subjectCode: subjectCode, periodCode: "A00" + i, classAverage: true});
                      
                      if (average !== -1) {
                        if (subject["A00" + i].coef === 0.0) { average = "Vide"; }
                        if (subject["A00" + i].coefClass === 0.0) { classAverage = "Vide"; }

                        subjectAverages.push(<span><h3>{"Trimestre " + i}</h3><h3>--</h3><h3 className="grade">{average}</h3><h3>--</h3><h3 className="subject">Classe: </h3><h3 className="grade">{classAverage}</h3></span>);
                      }
                    }
                    return subjectAverages;
                  })()}
                </div>
              );
            }
            // Return the HTML code for the averages
            return averages;

          } else {
            // Return this if there are no grades
            return (
              <div className="box">
                <h2>Pas de notes pour l'instant...</h2>
              </div>
            )
          }
        }
      })()}

      <form action="https://www.ecoledirecte.com" className="box">
        <h1>École Directe</h1>
        <p>Ce site calcule les moyennes de chaque matière ainsi que la moyenne générale, cette fonction n'est plus disponible sur le site officiel.</p>
        <button type="submit" onClick={() => setIsRedirecting(true)}>{isRedirecting ? "Redirection..." : "Site officiel ED"}</button>
        <p>DF</p>
      </form>
      <form action="https://github.com/diegofino15/moyennesed.my.to" className="box">
        <h1>GitHub</h1>
        <p>Vous pouvez voir le code source de ce site sur GitHub.</p>
        <button type="submit" onClick={() => setIsRedirecting(true)}>{isRedirecting ? "Redirection..." : "Voir code"}</button>
      </form>
    </div>
  )
}

export default App;

