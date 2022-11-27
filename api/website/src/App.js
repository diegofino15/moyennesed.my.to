import React, { useState } from "react";
import './App.css';


function App() {
  // Module to connect to the API's
  const axios = require('axios');

  // Password
  const [password, setPassword] = useState("");
  const handlePasswordChange = event => { setPassword(event.target.value); }

  // Helpers
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isRefreshing, setIsRefresing] = useState(false);
  const [data, setData] = useState({});

  const [hasReceived, setHasReceived] = useState(false);

  // Function to get the grades from the EcoleDirecte's API
  const getData = async() => {
    const APIURL = "https://api.moyennesed.my.to:777/get_full_count";
    const APIPayload = {
      "password": password
    };
    const APIHeaders = {};

    setIsRefresing(true);
    setHasReceived(false);

    axios.post(APIURL, APIPayload, { headers: APIHeaders }).then((apiResponse) => {
      if (apiResponse.data.successful) {
        setData(apiResponse.data);
        setIsRefresing(false);
        setHasReceived(true);
      }
    });
  }
  
  return (
    <div className="App">
      <div className="box">
        <h1>API Moyennes École Directe <a className="version">v2.1</a></h1>
        <input onChange={handlePasswordChange} type="password" placeholder="Password"></input>
        <button className="input" onClick={() => getData()}>Refresh</button>
      </div>

      {(() => {
        if (hasReceived) {
          var results = [];

          results.push(
            <div className="box">
              <h1>TOTAL COUNT</h1>
              <h3 className="count">{data.count}</h3>
            </div>
          );

          var keys = Object.keys(data.connections);
          for (let i = 0; i < keys.length; i++) {
            results.push(
              <div className="box">
                <h1>{keys[i]}</h1>
                {(() => {
                  var connections = [];
                  for (let j = 0; j < data.connections[keys[i]].length; j++) {
                    connections.push(
                      <h3>{data.connections[keys[i]][j]}</h3>
                    );
                  }
                  return connections;
                })()}
              </div>
            );
          }
          return results;
        }
      })()}

      <form action="https://moyennesed.my.to" className="box">
        <h1>Moyennes École Directe</h1>
        <p>Ce site calcule les moyennes de chaque matière ainsi que la moyenne générale, cette fonction n'est plus disponible sur le site officiel.</p>
        <button type="submit" onClick={() => setIsRedirecting(true)}>{isRedirecting ? "Redirection..." : "Accéder"}</button>
        <p>DF</p>
      </form>
    </div>
  )
}

export default App;

