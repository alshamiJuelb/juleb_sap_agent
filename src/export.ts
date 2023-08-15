import axios from "axios";
import { existsSync, promises } from "fs";

class Script {
  url = "https://api.juleb.com/agent_receiver/sap";
  // url = "http://localhost:5006/sap";

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
    const allBranches = [];
    for (let i = 0; i < params.branchesCodes.length; i++) {
      const branchCode = params.branchesCodes[i];
      const branchJE = await this.getBranchJE(
        params.startDate,
        params.endDate,
        branchCode
      );
      allBranches.push(branchJE);
    }
    await promises.writeFile(
      "./export.json",
      JSON.stringify(allBranches.flat())
    );
    console.log(`exported`);
  }
}

const script = new Script();
script.exportJE();
