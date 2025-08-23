import React from "react";
import "./App.css";
import Home from "./pages/Home";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";

function App() {
  const hRouter = createBrowserRouter([
    {
      path: "/",
      element: <Home />
        
    },

    {
      path:"/login",
      element:<Login />
    }
  ]);
  return (
    <>
      <RouterProvider router={hRouter} />
    </>
  );
}

export default App;
