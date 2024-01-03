const express = require('express');
const cors = require('cors')
const app =express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000

require('dotenv').config()
//middleware
app.use(cors())
app.use(express.json())

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fpdogwm.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

   //all database collection
   const userCollection = client.db("messManageDB").collection("users")
   const mealCollection = client.db("messManageDB").collection("meals")

 //jwt related api
 app.post('/jwt',async(req,res)=>{
  const user =req.body
  const token =jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'24h'})
  res.send({token})
})

//verify token milldlewares

const verifyToken =(req,res,next)=>{
  console.log('inside verfiy token',req.headers);
  if(!req.headers.authorization){
    return res.status(401).send({message: 'forbidden access'})
  }
  const token = req.headers.authorization.split(' ')[1]
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message: 'forbidden access'})
    }
    req.decoded =decoded
    next()
  })
}

   //users related api
   app.post('/users',async(req,res)=>{
    const user= req.body;
    //insert email if user does not exist
    const query = {email: user.email}
    const existingUser = await userCollection.findOne(query)
    if(existingUser){
      return res.send({message: 'user already exist',insertedId:null})
    }
    const result = await userCollection.insertOne(user)
    res.send(result)
   })


//check admin
app.get('/users/admin/:email',async(req,res)=>{
  const email =req.params.email
  // if(email!==req.decoded.email){
  //   return res.status(403).send({message:'unauthorized access'})
  // }
  const query={email:email}
  const user =await userCollection.findOne(query)
  let admin=false
  if(user){
    admin=user?.roll==='admin'
  }
  res.send({admin})
})

//make admin

//admin made api
app.patch('/users/admin/:id',verifyToken,async(req,res)=>{
  const id = req.params.id
  const filter= {_id: new ObjectId(id)}
const updatedDoc ={
$set:{
  roll: 'admin'
}
}
const result = await userCollection.updateOne(filter,updatedDoc)
res.send(result)
})

// delete users 
app.delete('/users/:email',verifyToken,async(req,res)=>{
  const email = req.params.email
  const query= {email: email}
  const result = await userCollection.deleteOne(query)
  res.send(result)
})


//users api
app.get('/users',async(req,res)=>{
  const result = await userCollection.find().toArray()
  res.send(result)
})

//add meal by admin
 app.post('/meals',async(req,res)=>{
  const meal = req.body
  const result = await mealCollection.insertOne(meal)
  res.send(result)
 })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
  res.send('user management server is running')
})

app.listen(port,()=>{
  console.log(`server is running on PORT: ${port}`);
})