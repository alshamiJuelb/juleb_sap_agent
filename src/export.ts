import axios from "axios";
import { existsSync, promises } from "fs";

class Script {
  url = "https://api.juleb.com/agent_receiver/sap";
  // url = "https://5e7e-176-18-80-157.ngrok-free.app/sap";

  async getBranchJE(startDate, endDate, companyCode) {
    try {
      return (
        await axios.get(`${this.url}/journal-entries`, {
          params: { startDate, endDate, companyCode },
        })
      ).data;
    } catch (err) {
      console.log(err);
    }
  }

  async exportJE() {
    const paramsExist = existsSync("./params.json");
    if (!paramsExist) {
      console.log(
        "make sure to have params.json and bookmark.json in the project directory"
      );
      return;
    }
    const params = JSON.parse(
      (await promises.readFile("./params.json")).toString()
    );
    const allBranches = await Promise.all(
      params.branchesCodes.map(
        async (branch) =>
          await this.getBranchJE(params.startDate, params.endDate, branch)
      )
    );
    await promises.writeFile(
      "./export.json",
      JSON.stringify(allBranches.flat())
    );
  }
}

const script = new Script();
script.exportJE();
