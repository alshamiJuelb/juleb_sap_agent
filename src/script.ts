import axios from "axios";
import * as sql from "mssql";
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

  async insertJE(lines) {
    try {
      const table = new sql.Table("dbo.JournalEntries");
      table.create = true;
      table.columns.add("Branch", sql.VarChar(50), { nullable: false });
      table.columns.add("VoucherType", sql.VarChar(50), { nullable: false });
      table.columns.add("VoucherNumber", sql.Int, { nullable: false });
      table.columns.add("VoucherDate", sql.Date, { nullable: false });
      table.columns.add("DueDate", sql.Date, { nullable: true });
      table.columns.add("AccountType", sql.VarChar(50), { nullable: false });
      table.columns.add("AccountCode", sql.VarChar(50), { nullable: false });
      table.columns.add("DebitAmount", sql.Money, { nullable: true });
      table.columns.add("CreditAmount", sql.Money, { nullable: true });
      table.columns.add("CostCenter1", sql.VarChar(50), { nullable: true });
      table.columns.add("CostCenter2", sql.VarChar(50), { nullable: true });
      table.columns.add("CostCenter3", sql.VarChar(50), { nullable: true });
      table.columns.add("Remarks", sql.NVarChar(256), { nullable: true });
      table.columns.add("DocNum", sql.VarChar(50), { nullable: true });
      table.columns.add("FileName", sql.VarChar(256), { nullable: true });
      table.columns.add("RegDate", sql.SmallDateTime, { nullable: true });
      table.columns.add("Remarks1", sql.NVarChar(50), { nullable: true });
      lines.data.forEach((line) => {
        table.rows.add(
          line.Branch.toString(),
          line.VoucherType,
          line.VoucherNumber,
          new Date(line.VoucherDate),
          new Date(line.DueDate),
          line.AccountType,
          line.AccountCode,
          line.DebitAmount,
          line.CreditAmount,
          line.CostCenter1,
          line.CostCenter2,
          line.CostCenter3,
          line.Remarks,
          line.DocNum,
          line.FileName ? line.FileName : null,
          line.RegDate ? line.RegDate : null,
          line.Remarks1 ? line.Remarks1 : null
        );
      });
      const pool = new sql.ConnectionPool({
        user: "juleb-integration", //CHANGE THIS juleb-integration
        password: "9!cf9voK", //CHANGE THIS - 9!cf9voK
        database: "Integration", //CHANGE THIS - Integration_test
        server: "192.168.1.9\\MSSQL2016", //LAPTOP-T8JG9PTD '192.168.1.8'
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
        options: {
          encrypt: false,
          trustServerCertificate: true,
          trustedConnection: true,
        },
      });
      console.log("establishing connection");
      await pool
        .connect()
        .then(async () => {
          console.log("connection established, beginning transaction");
          const transaction = new sql.Transaction(pool);
          await transaction.begin();
          const request = new sql.Request(transaction);
          console.log("transaction started, now starting request");
          await request.bulk(table).then(async () => {
            await transaction.commit({});
            console.log("comitted transaction request");
          });
        })
        .finally(() => {
          pool.close;
        });
    } catch (ex) {
      console.log("ERRROR");
      console.log(ex);
    }
  }

  async wrapper() {
    const paramsExist = existsSync("./params.json");
    if (!paramsExist) {
      console.log("make sure to have params.json in the project directory");
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
    if (allBranches.length) await this.insertJE(allBranches);
    else console.log("no data to insert");
  }
}

const script = new Script();
script.wrapper();
