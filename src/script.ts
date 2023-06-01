import axios from "axios";
import * as sql from "mssql";
import { existsSync, promises } from "fs";

class Script {
  // url = "https://api.juleb.com/agent_receiver/sap";
  url = "https://69be-176-18-80-157.ngrok-free.app/sap";

  async insertTest(sqlConfig, startDate, endDate, companyCode) {
    try {
      const lines = await axios.get(`${this.url}/journal-entries`, {
        params: { startDate, endDate, companyCode },
      });
      // await promises.writeFile("./test.json", JSON.stringify(lines.data));
      // return;
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
        console.log(table.rows[0]);
        const pool = new sql.ConnectionPool(sqlConfig);
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
    } catch (err) {
      console.log(err);
    }
  }

  async mytest(sqlConfig) {
    try {
      // make sure that any items are correctly URL encoded in the connection string
      console.log("connecting");
      await sql.connect(sqlConfig);
      const result =
        await sql.query`select TOP (100) * from [integration-test].dbo.journalEntries`; //change paramw
      console.log(result);
    } catch (err) {
      console.log("failed");
      console.log(err);
      // ... error checks
    }
  }

  async wrapper() {
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
    const sqlConfig = {
      user: "juleb-integration", //CHANGE THIS juleb-integration
      password: "9!cf9voK", //CHANGE THIS - 9!cf9voK
      database: "Integration_test", //CHANGE THIS - Integration_test
      server: "192.168.1.9\\MSSQL2016", //LAPTOP-T8JG9PTD '192.168.1.8'
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: false, // for azure
        trustServerCertificate: true,
        trustedConnection: true, // change to true for local dev / self-signed certs
      },
    };
    // await this.mytest(sqlConfig);
    // return;
    for (let i = 0; i < params.branchesCodes.length; i++) {
      const branchCode = params.branchesCodes[i];
      console.log(`syncing branch code ${branchCode}`);
      await this.insertTest(
        sqlConfig,
        params.startDate,
        params.endDate,
        branchCode
      );
      console.log(`Done syncing branch ${branchCode}`);
    }
  }
}

const script = new Script();
script.wrapper();
