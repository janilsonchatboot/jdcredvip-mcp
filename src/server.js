import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(
    `Motor de Triagem JD CRED VIP rodando com transparência em http://localhost:${PORT}/triagem`
  );
});
