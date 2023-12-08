import { init } from "./create-nexus";

init()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
