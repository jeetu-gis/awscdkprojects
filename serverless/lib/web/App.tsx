import React,{useEffect,useState} from "react";
import { Location, LocationType } from "../fns/mylocationsTable";
import { getLocations, saveLocation } from "./utils";
import { v4 as uuidv4 } from 'uuid';

export const App = () => {
    
    const[locations,setLocations] = useState([]);
    const[subject,setSubject] = useState("");
    const[lat,setLat] = useState("");
    const[lon,setLon] = useState("");


    useEffect(() => {
        getLocations().then((n) => setLocations(n));
    }, []);

    const clickHandler = async () => {
        if (subject && lat && lon) {
            setLat('');
            setLon('');
          setSubject('');
          await saveLocation({
            id:uuidv4(),
            lat,
            subject,
            lon,
          });
          const n = await getLocations();
          setLocations(n);
        }
      };

    
    return (
        <div>
          <div>
            <div>
              <input
                 onChange={(e) => setLat(e.target.value)}
                 placeholder="Add Latitude"
                 type="text"
                 value={lat}
              />
            </div>
            <div>
              <input
                 onChange={(e) => setLon(e.target.value)}
                 placeholder="Add Longitude"
                 type="text"
                 value={lon}
              />
            </div>
            <div>
              <textarea
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Location Description"
                value={subject}
              ></textarea>
            </div>
            <div>
              <button onClick={clickHandler}>save</button>
            </div>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Lat</th>
                  <th>Lon</th>
                  <th>Location Description</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location: LocationType) => (
                  <tr key={location.id}>
                    <td>{location.lat}</td>
                    <td>{location.lon}</td>
                    <td>{location.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
};



export default App;


