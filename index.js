const express = require('express');
const dotenv = require('dotenv')
dotenv.config()
const cors = require('cors')
const app = express()
const port = process.env.PORT;
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors())
app.use(express.json())


const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
   
    // await client.connect();
    const db = client.db("TaskHive");
    const taskCollection = db.collection("tasks");

    app.post('/api/tasks', async(req, res)=>{
      const data = req.body;
      const result = await taskCollection.insertOne(data);
      res.json(result)
    })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})