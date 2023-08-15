import axios from "axios";
import { existsSync, promises } from "fs";

class Script {
  groupBy(arr: any[], key: string) {
    return arr.reduce((rv, x) => {
      try {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
      } catch (error) {
        return [];
      }
    }, {});
  }

  async exportJE() {
    const dataFile = existsSync("./export.json");
    if (!dataFile) {
      console.log(
        "make sure to have params.json and bookmark.json in the project directory"
      );
      return;
    }
    const data = JSON.parse(
      (await promises.readFile("./export.json")).toString()
    );
    const dataByDays = this.groupBy(data, "Remarks");
    const dataKeys = Object.keys(dataByDays);
    for (let i = 0; i < dataKeys.length; i++) {
      const key = dataKeys[i];
      const dataByJE = this.groupBy(dataByDays[key], "DocNum");
      const JEKeys = Object.keys(dataByJE);
      for (let j = 0; j < JEKeys.length; j++) {
        const JEKey = JEKeys[j];
        const debit = dataByJE[JEKey].reduce(
          (a, c) => parseFloat((a + c.DebitAmount).toFixed(2)),
          0
        );
        const credit = dataByJE[JEKey].reduce(
          (a, c) => parseFloat((a + c.CreditAmount).toFixed(2)),
          0
        );
        if (debit !== credit)
          console.log(`${key} - ${JEKey} -> debit=${debit}  credit=${credit}`);
        // return;
      }
    }
  }
}

const script = new Script();
script.exportJE();
