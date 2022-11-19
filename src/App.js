import React, { useState } from "react";
import './App.css';


function App() {
  // Basic variables for connecting
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
  const getAverage = ({ codeMatiere, codePeriode }) => {
    if (codePeriode in realGrades[codeMatiere]) {
      return realGrades[codeMatiere][codePeriode].moyenne;
    } else {
      return -1;
    }
  }

  // Function to get the grades from the EcoleDirecte's API
  const getData = async() => {
    // Set the current state to loading
    setIsLoading(true);

    // The URL to get the session token from EcoleDirecte's API
    const loginURL = "https://api.ecoledirecte.com/v3/login.awp?v=4.17.9";
    
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

      // The URL to get the grades from EcoleDirecte's API
      const gradesURL = "https://api.ecoledirecte.com/v3/eleves/" + studentID + "/notes.awp?verbe=get&v=4.17.9";

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
      "GENERALE": {}
    };
    
    // Addition of the grades
    for (var note of data.notes) {
      // Create the suject's object in the grades dictionnary
      if (!(note.codeMatiere in grades)) {
        grades[note.codeMatiere] = {};
      }

      // Create the subject's object in the right period in the grades dictionnary
      if (!(note.codePeriode in grades[note.codeMatiere])) {
        grades[note.codeMatiere][note.codePeriode] = {
          "total": 0.0,
          "coef": 0.0,
          "moyenne": 0.0
        }
        grades[note.codeMatiere].completeName = note.libelleMatiere;
      }

      // Get the grade and coefficient
      var valeur = parseFloat(note.valeur.replace(",", "."));
      var valeurSur = parseFloat(note.noteSur.replace(",", "."));

      // Set the coefficient to 1 if not provided and 0 if grade is not significative
      var coef = parseFloat(note.coef);
      if (note.nonSignificatif) { coef = 0.0; }
      else if (coef === 0.0) { coef = 1.0; }

      // Check if the grade is a value and not "Abs"
      if (!isNaN(valeur)) {
        // Calculate the value of the grade / 20
        var valeurNote = (valeur / (valeurSur / 1.0)) * 20.0;

        // Add the value * coef to the correct object
        grades[note.codeMatiere][note.codePeriode].total += valeurNote * coef;
        grades[note.codeMatiere][note.codePeriode].coef += coef;
      }
    }

    // Calculation of the subject's averages 
    for (const [codeMatiere, matiere] of Object.entries(grades)) {
      // Check that the subject isn't the GENERAL average
      if (codeMatiere !== "GENERALE") {
        for (const [codePeriode, periode] of Object.entries(matiere)) {
          if (codePeriode !== "completeName") {
            // Calculate the average
            var moyenne = grades[codeMatiere][codePeriode].total / grades[codeMatiere][codePeriode].coef;
            // Rounding it to 2 decimals
            moyenne = Math.round(moyenne * 100) / 100.0;
            grades[codeMatiere][codePeriode].moyenne = moyenne;
            
            // Add the period to the GENERAL average if not already there
            if (!(codePeriode in grades.GENERALE)) {
              grades.GENERALE[codePeriode] = {
                "total": 0.0,
                "coef": 0.0,
                "moyenne": 0.0
              };
              grades.GENERALE.completeName = "MOYENNE GÉNÉRALE";
            }
            
            // Add the average and coefficient
            grades.GENERALE[codePeriode].total += moyenne;
            grades.GENERALE[codePeriode].coef += 1.0;
          }
        }
      }
    }

    // Calculation of the GENERAL average
    for (const [codePeriode, periode] of Object.entries(grades.GENERALE)) {
      if (codePeriode !== "completeName") {
        // Calculate the average of the right period
        var moyenne = grades.GENERALE[codePeriode].total / grades.GENERALE[codePeriode].coef;
        // Rounding the average to 2 decimals
        moyenne = Math.round(moyenne * 100) / 100.0;
        grades.GENERALE[codePeriode].moyenne = moyenne;
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
      setIsValidated(true);
      getData();
    }
  }
  
  // Return the actual HTML code
  return (
    <div className="App">
      {(() => {
        return (
            <div>
              <div className="box">
                <h1>Moyennes École Directe <a className="version">v2</a></h1>
                <p>Entrez votre identifiant et mot de passe ED</p>
                <a>{loginSuccessful ? "" : "Identifiant ou mot de passe incorrect"}</a>
                <input onChange={handleUsernameChange} type="text" placeholder="Identifiant"></input>
                <input onChange={handlePasswordChange} type="password" placeholder="Mot de passe"></input>
                <button onClick={submit}>{isConnecting ? "Connexion..." : isTaking ? "Récupération des notes..." : "Valider"}</button>
              </div>

              {(() => {
                // Displaying the averages if calculated
                if (isValidated && loginSuccessful && !isLoading) {
                  if (isThereGrades) {
                    // Define the object where all the HTML code for the
                    // averages will be put
                    var moyennes = [];

                    // Loop through the averages to add them to the list
                    for (const [codeMatiere, matiere] of Object.entries(realGrades)) {
                      moyennes.push(
                        <div className="box">
                          <h1>{matiere.completeName}</h1>
                          {(() => {
                            // First period
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A001"});
                            // Return HTML code only if an average is present
                            if (average !== -1) {
                              return <span><h3>{"Trimestre 1"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                          {(() => {
                            // Second period
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A002"});

                            if (average !== -1) {
                              return <span><h3>{"Trimestre 2"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                          {(() => {
                            // Third period
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A003"});

                            if (average !== -1) {
                              return <span><h3>{"Trimestre 3"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                        </div>
                      );
                    }
                    // Return the HTML code for the averages
                    return moyennes;

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
                <p>Ce cite calcule les moyennes de chaque matière ainsi que la moyenne générale, cette fonction n'est plus disponible sur le site officiel.</p>
                <button type="submit" onClick={() => setIsRedirecting(true)}>{isRedirecting ? "Redirection..." : "Site officiel ED"}</button>
                <p>DF</p>
              </form>
            </div>
          )
      })()}
    </div>
    
  );
}

export default App;
