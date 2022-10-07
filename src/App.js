import React, { useState } from "react";
import './App.css';


function App() {
  // Basic variables for connecting
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Module to connect to the API's
  const axios = require('axios');

  // Define all the variables for the graphics effects
  // and validating
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

  // Function to get the grades from the EcoleDirecte API's
  const getData = async() => {
    // Set the current state to loading
    setIsLoading(true);

    // The URL of the API to get the session token
    const loginURL = "https://api.ecoledirecte.com/v3/login.awp?v=4.17.9";
    
    
    const loginPayload = {
      "uuid": "",
      "identifiant": username,
      "motdepasse": password,
      "isReLogin": false
    }

    setIsConnecting(true);
    axios.post(loginURL, "data=" + JSON.stringify(loginPayload)).then((loginResponse) => {
      setIsConnecting(false);
      const loginResponseCode = loginResponse.data.code;
      if (loginResponseCode !== 200) {
        setIsValidated(false);
        setLoginSuccessful(false);
        setIsLoading(false);
        return 0;
      }
      setLoginSuccessful(true);
      
      const studentToken = loginResponse.data.token;
      const studentID = loginResponse.data.data.accounts[0].id;

      const gradesURL = "https://api.ecoledirecte.com/v3/eleves/" + studentID + "/notes.awp?verbe=get&v=4.17.9";

      const gradesPayload = {
        "anneeScolaire": ""
      }

      const gradesHeaders = {
        "x-token": studentToken
      }

      setIsTaking(true);
      axios.post(gradesURL, "data=" + JSON.stringify(gradesPayload), { headers: gradesHeaders }).then((gradesResponse) => {
        setIsTaking(false);
        const gradesResponseCode = gradesResponse.data.code;
        if (gradesResponseCode !== 200) {
          setIsLoading(false);
          return 0;
        }
        calculateAverages(gradesResponse.data);
      });
    });
  }

  const calculateAverages = ({ data }) => {
    if (!(data.notes.length === 0)) { setIsThereGrades(true); }
    else { setIsThereGrades(false); }

    var grades = {
      "GENERALE": {}
    };
    
    // Addition des notes
    for (var note of data.notes) {
      if (!(note.codeMatiere in grades)) {
        grades[note.codeMatiere] = {};
      }
      if (!(note.codePeriode in grades[note.codeMatiere])) {
        grades[note.codeMatiere][note.codePeriode] = {
          "total": 0.0,
          "coef": 0.0,
          "moyenne": 0.0
        }
        grades[note.codeMatiere].completeName = note.libelleMatiere;
      }
      var valeur = parseFloat(note.valeur.replace(",", "."));
      var valeurSur = parseFloat(note.noteSur.replace(",", "."));

      var coef = parseFloat(note.coef);
      if (note.nonSignificatif) { coef = 0.0; }
      else if (coef === 0.0) { coef = 1.0; }

      console.log(coef);

      if (!isNaN(valeur)) {
        var valeurNote = (valeur / (valeurSur / 1.0)) * 20.0;

        grades[note.codeMatiere][note.codePeriode].total += valeurNote * coef;
        grades[note.codeMatiere][note.codePeriode].coef += coef;
      }
    }

    // Calcul des moyennes par matière
    for (const [codeMatiere, matiere] of Object.entries(grades)) {
      if (codeMatiere !== "GENERALE") {
        for (const [codePeriode, periode] of Object.entries(matiere)) {
          if (codePeriode !== "completeName") {
            var moyenne = grades[codeMatiere][codePeriode].total / grades[codeMatiere][codePeriode].coef;
            moyenne = Math.round(moyenne * 100) / 100.0;
            grades[codeMatiere][codePeriode].moyenne = moyenne;
            
            if (!(codePeriode in grades.GENERALE)) {
              grades.GENERALE[codePeriode] = {
                "total": 0.0,
                "coef": 0.0,
                "moyenne": 0.0
              };
              grades.GENERALE.completeName = "MOYENNE GÉNÉRALE";
            }
            
            grades.GENERALE[codePeriode].total += moyenne;
            grades.GENERALE[codePeriode].coef += 1.0;
          }
        }
      }
    }

    // Calcul de la moyenne générale
    for (const [codePeriode, periode] of Object.entries(grades.GENERALE)) {
      if (codePeriode !== "completeName") {
        var moyenne = grades.GENERALE[codePeriode].total / grades.GENERALE[codePeriode].coef;
        moyenne = Math.round(moyenne * 100) / 100.0;
        grades.GENERALE[codePeriode].moyenne = moyenne;
      }
    }

    setRealGrades(grades);
    setIsLoading(false);
  }

  const submit = async() => {
    if (!isLoading) {
      setIsValidated(true);
      getData();
    }
  }
  
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
                // Affichage des Moyennes
                if (isValidated && loginSuccessful && !isLoading) {
                  if (isThereGrades) {
                    var moyennes = [];

                    for (const [codeMatiere, matiere] of Object.entries(realGrades)) {
                      moyennes.push(
                        <div className="box">
                          <h1>{matiere.completeName}</h1>
                          {(() => {
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A001"});

                            if (average !== -1) {
                              return <span><h3>{"Trimestre 1"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                          {(() => {
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A002"});

                            if (average !== -1) {
                              return <span><h3>{"Trimestre 2"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                          {(() => {
                            const average = getAverage({codeMatiere: codeMatiere, codePeriode: "A003"});

                            if (average !== -1) {
                              return <span><h3>{"Trimestre 3"}</h3><h3>--</h3><h3 className="note">{average}</h3></span>;
                            }
                          })()}
                        </div>
                      );
                    }
                    return moyennes;

                  } else {
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
