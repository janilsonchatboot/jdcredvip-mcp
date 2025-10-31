import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Helmet } from "react-helmet";

createRoot(document.getElementById("root")!).render(
  <>
    <Helmet>
      <title>JDTalk - WhatsApp Customer Support</title>
      <meta name="description" content="Customer support application that integrates with WhatsApp Business API" />
      <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/1384/1384055.png" type="image/png" />
    </Helmet>
    <App />
  </>
);
