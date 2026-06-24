const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const app = express();
// const port = process.env.PORT;
const port = 8080;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.LOCAL_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];

  console.log(token);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};









async function run() {
  try {
    // await client.connect();
    
    const db = client.db("TaskHive");
    const taskCollection = db.collection("tasks");
    const userCollection = db.collection("user");
    const proposalsCollection = db.collection("proposals");

    app.post("/api/tasks", async (req, res) => {
      const data = req.body;
      const newData = {
        ...data,
        postedDate: new Date(),
      };
      const result = await taskCollection.insertOne(newData);
      res.send(result);
    });

    app.get("/api/tasks", async (req, res) => {
      const query = {};
      if (req.query.search) {
        query.title = {
          $regex: req.query.search,
          $options: "i",
        };
      }

      if (req.query.category) {
        query.category = { $in: req.query.category.split(",") };
      }
      if (req.query.status) {
        query.status = { $in: req.query.status.split(",") };
      }
      const result = await taskCollection
        .find(query)
        .sort({ postedDate: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/api/openTasks", verifyToken, async (req, res) => {
      const { email } = req.query;

      const result = await taskCollection
        .find({ clientEmail: email, status: "open" })
        .toArray();

      res.send(result);
    });

    app.get("/api/InProgressTasks", verifyToken, async (req, res) => {
      const { email } = req.query;

      const result = await taskCollection
        .find({ clientEmail: email, status: "in progress" })
        .toArray();

      res.send(result);
    });

    app.delete("/api/tasks/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //  app.delete("/api/tasks/:id", async (req, res) => {
    //   const { id } = req.params;

    //   const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });
    //   res.json(result);
    // });

    app.get("/api/tasks/open-task", verifyToken, async (req, res) => {
      const result = await taskCollection
        .find({ status: "in progress" })
        .toArray();
      res.send(result);
    });

    app.get("/api/tasks/total/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      const result = await taskCollection
        .find({ clientEmail: email })
        .sort({ postedDate: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/api/tasks/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await taskCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/api/tasks/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const result = await taskCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...data,
          },
        },
      );
      res.send(result);
    });

    // ********************************************************
    // ********************************************************
    // ********************************************************

    app.get("/api/freelancers", async (req, res) => {
      const result = await userCollection
        .find({ role: "freelancer" })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });
    app.get("/api/freelancers/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await userCollection.findOne({
        _id: new ObjectId(id),
        role: "freelancer",
      });
      if (!result) {
        return res.status(404).send({ message: "Freelancer not found" });
      }
      res.send(result);
    });

    // ********************************************************
    // ********************************************************
    // ********************************************************

    app.get("/api/proposals/pending", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await proposalsCollection
        .find({ freelancerEmail: email, status: "pending" })
        .toArray();

      res.send(result);
    });

    app.post("/api/proposals", verifyToken, async (req, res) => {
      const data = req.body;
      const newData = {
        ...data,
        createdAt: new Date(),
      };
      const result = await proposalsCollection.insertOne(newData);

      await taskCollection.updateOne(
        { _id: new ObjectId(data.taskId) },
        {
          $inc: {
            proposalCount: 1,
          },
        },
      );

      await taskCollection.updateOne(
        { _id: new ObjectId(data?.taskId) },
        {
          $set: {
            status: "in progress",
          },
        },
      );
      res.send(result);
    });

    app.get("/api/proposals/check", verifyToken, async (req, res) => {
      const { taskId, freelancerEmail } = req.query;

      const result = await proposalsCollection.findOne({
        taskId,
        freelancerEmail,
      });

      res.send(!!result);
    });

    app.get("/api/proposals/:taskId",verifyToken, async (req, res) => {
      const { taskId } = req.params;

      const result = await proposalsCollection.find({ taskId }).toArray();
      res.send(result);
    });

    app.get("/api/proposals", async (req, res) => {
      const email = req.query.email;

      const result = await proposalsCollection
        .find({ freelancerEmail: email })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/api/manage-proposal", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await proposalsCollection
        .find({ clientEmail: email })
        .toArray();
      res.send(result);
    });

    app.get("/api/manage-proposal-accepted", verifyToken, async (req, res) => {
      const email = req.query.email;

      const result = await proposalsCollection
        .find({
          freelancerEmail: email,
          status: { $in: ["accepted", "completed"] },
        })
        .toArray();

      res.send(result);
    });

    app.patch("/api/manage-proposal-accepted", verifyToken, async (req, res) => {
      const email = req.query.email;
      const { taskId } = req.body;
      const { deliverableUrl } = req.body;

      const Select = await proposalsCollection.updateOne(
        { freelancerEmail: email, taskId: taskId },
        {
          $set: {
            deliverableUrl: deliverableUrl,
            status: "completed",
          },
        },
      );

      await taskCollection.updateOne(
        { _id: new ObjectId(taskId), freelancerEmail: email },
        {},
      );

      res.send(Select);
    });

    app.patch("/api/proposals/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const { status } = req.body;

      const proposal = await proposalsCollection.findOne({
        _id: new ObjectId(id),
      });
      // console.log("ID:", id);
      // console.log("Status:", status);
      const result = await proposalsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { status },
        },
      );

      await proposalsCollection.updateMany(
        {
          taskId: proposal.taskId,
          _id: { $ne: new ObjectId(id) },
        },
        {
          $set: {
            status: "rejected",
          },
        },
      );

      res.send(result);
    });

    app.get("/api/admin/users", verifyToken, async (req, res) => {
      const query = {};

      if (req.query.search) {
        query.name = {
          $regex: req.query.search,
          $options: "i",
        };
      }
      if (req.query.role) {
        query.role = req.query.role;
      }
      const result = await userCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.patch("/api/admin/users/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { isBlocked } = req.body;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isBlocked: isBlocked,
          },
        },
      );
      res.send(result);
    });

    app.patch("/api/users/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID" });
        }

        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: req.body,
            $currentDate: { updatedAt: true },
          },
        );

        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send(err);
      }
    });



    app.get("/api/adminLength", async(req, res)=>{
      const result = await userCollection.find({role: 'admin'}).toArray()
      res.send(result)
    })
    app.get("/api/freelancerLength", async(req, res)=>{
      const result = await userCollection.find({role: 'freelancer'}).toArray()
      res.send(result)
    })
    app.get("/api/clientLength", async(req, res)=>{
      const result = await userCollection.find({role: 'client'}).toArray()
      res.send(result)
    })
















    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
