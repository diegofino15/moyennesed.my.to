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

  const submit = async() => {
    if (!isRefreshing) {
      getData();
    }
  }
  
  return (
    <div className="App">
      <div className="box">
        <h1>API Moyennes École Directe <a className="version">v2.1</a></h1>
        <input onChange={handlePasswordChange} type="password" placeholder="Password"></input>
        <button className="input" onClick={() => submit()}>Refresh</button>
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

          results.push(
            <div className="box">
              <h1>Per person count</h1>
              <div className="persons">
                {(() => {
                  var connections = [];
                  var keys = Object.keys(data.connections);

                  var final = {};
                  for (let i = 0; i < keys.length; i++) {
                    final[keys[i]] = data.connections[keys[i]].length;
                  }

                  var items = Object.keys(final).map(
                    (key) => { return [key, final[key]] });
                  items.sort(
                    (first, second) => { return first[1] - second[1]; }
                  );

                  for (let i =( items.length - 1); i > 0; i--) {
                    var obj = items[i];
                    connections.push(
                      <span>
                        <h3>{obj[0]}</h3>
                        <h3 className="count"> - </h3>
                        <h3 className="count">{obj[1]}</h3>
                      </span>
                    );
                  }

                  return connections;
                })()}
              </div>
            </div>
          );
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

