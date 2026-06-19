const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const app = express();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
async function run() {
  try {
    // await client.connect();
    const db = client.db("TaskHive");
    const taskCollection = db.collection("tasks");
    const userCollection = db.collection("user");

    app.post("/api/tasks", async (req, res) => {
      const data = req.body;
      const newData ={
        ...data,
        postedDate: new Date(),
      }
      const result = await taskCollection.insertOne(newData);
      res.json(result);
    });

    app.get("/api/tasks", async (req, res) => {
      const query = {}
      if (req.query.search) {
        query.title = {
          $regex: req.query.search, $options: 'i'
        };     
      };

      if (req.query.category) {
        query.category = {$in : req.query.category.split(',')}
      }
      const result = await taskCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/api/tasks/:id", async (req, res) => {
      const { id } = req.params;

      const result = await taskCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.delete("/api/tasks/:id", async (req, res) => {
      const { id } = req.params;

      const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.patch("/api/tasks/:id", async(req, res)=>{
      const {id} = req.params;
      const data = req.body;
      const result =await taskCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set: {
          ...data
        }}
      )
      res.send(result)
    })


// ********************************************************
// ********************************************************
// ********************************************************

app.get("/api/freelancers", async(req, res)=>{
  const result = await userCollection.find({role :'freelancer'}).toArray();
  res.send(result)
})
app.get("/api/freelancers/:id", async(req, res)=>{
  const {id} = req.params;
  const result = await userCollection.findOne({_id: new ObjectId(id), role: "freelancer",});
  if (!result) {
    return res.status(404).send({ message: "Freelancer not found" });
  }
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
