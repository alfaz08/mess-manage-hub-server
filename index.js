const express = require('express');
const cors = require('cors')
const app =express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000

require('dotenv').config()
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const paymentCollection = client.db("messManageDB").collection("payments")
    const bazarBookedCollection = client.db("messManageDB").collection("books")
    const bazarCollection= client.db("messManageDB").collection("bazar")
    const announcementCollection= client.db("messManageDB").collection("announcement")
    const bookMealCollection= client.db("messManageDB").collection("mealBookList")

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


 //vendor shop payment 
  app.post('/member-payment',async(req,res)=>{
    const {price} = req.body;
    const amount = parseFloat(price *100)

    const paymentIntent= await stripe.paymentIntents.create({
      amount:amount,
      currency: 'usd',
      payment_method_types: ['card']
    })
    res.send({
      clientSecret: paymentIntent.client_secret
    })
  })

  //vendor payment store in database

  app.post('/memberPayments',async(req,res)=>{
    const payment =req.body
    const result = await paymentCollection.insertOne(payment)
    res.send(result)
  })
  //after payment membership upgrade of vendor
  app.patch('/member/:email',async(req,res)=>{
    const email = req.params.email
    const filter= {email: email}
  const updatedDoc ={
  $set:{
    type: 'premium'
  }
  }
  const result = await userCollection.updateOne(filter,updatedDoc)
  res.send(result)
  })

  //individual data find
   app.get('/users/info', async (req, res) => {
    try {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  //bazar booked collection api
  
  //vendor payment store in database

  app.post('/bazarBooked',async(req,res)=>{
    const booked=req.body
    const result = await bazarBookedCollection.insertOne(booked)
    res.send(result)
  })
  // //after booked bazar date user bazar update yes
  app.patch('/member/bazar/:email',async(req,res)=>{
    const email = req.params.email
    const bookingDate = req.body.bookingDate
    const filter= {email: email}
  const updatedDoc ={
  $set:{
    bazar: 'yes',
    bookingDate: bookingDate,
  }
  }
  const result = await userCollection.updateOne(filter,updatedDoc)
  res.send(result)
  })



  
  //get the all data of bazar booking list

  app.get('/books',async(req,res)=>{
    const result =await bazarBookedCollection.find().toArray()
    res.send(result)

  })
  
  //delete from bazar booking list
  app.delete('/bazarBooking/:email',verifyToken,async(req,res)=>{
    const email = req.params.email
    const query= {email: email}
    const result = await bazarBookedCollection.deleteOne(query)
    res.send(result)
  })

   //bazar list stored in db
   app.post('/bazar',async(req,res)=>{
    const bazar = req.body
    const result = await bazarCollection.insertOne(bazar)
    res.send(result)
   })

  //all bazar api
  //users api
app.get('/bazar',async(req,res)=>{
  const result = await bazarCollection.find().toArray()
  res.send(result)
})
//all meal api
app.get('/meals',async(req,res)=>{
  const result = await mealCollection.find().sort({date: 1}).toArray()
  res.send(result)
})

 //delete meal from bazar booking list
 app.delete('/allMeal/:id',verifyToken,async(req,res)=>{
  const id= req.params.id
  const query= {_id: new ObjectId(id)}
  console.log(query);
  const result = await mealCollection.deleteOne(query)
  res.send(result)

})

//announcement api

 app.post('/announcements',async(req,res)=>{
  const announcement = req.body
  const result = await announcementCollection.insertOne(announcement)
  res.send(result)
 })

 app.get('/announcements',async(req,res)=>{
  const result = await announcementCollection.find().toArray()
  res.send(result)
 })

 //delete announcement
 app.delete('/announcements/:id',verifyToken,async(req,res)=>{
  const id= req.params.id
  const query= {_id: new ObjectId(id)}
  
  const result = await announcementCollection.deleteOne(query)
  res.send(result)

})


  //get user payment api
   //get customer payment history from db

  app.get('/userDeposit/:email',async(req,res)=>{
    const query = {email: req.params.email}

    
    
    const result = await paymentCollection.find(query).toArray()
    res.send(result)
  })


  //user total payment list by admin
  app.get('/paymentList',async(req,res)=>{
    const result = await paymentCollection.find().toArray()
    res.send(result)
  })
  


  //book meal by members api

  app.post('/bookMeal',async(req,res)=>{
    const meal = req.body
    const result = await bookMealCollection.insertOne(meal)
    res.send(result)
   })
 
   //get book meal of individual users

   app.get('/userBookMeal/:email',async(req,res)=>{
    const query = {email: req.params.email}
    const result = await bookMealCollection.find(query).toArray()
    res.send(result)
  })

  //get all meal for admin
  app.get('/totalBookMeal',async(req,res)=>{
   
    const result = await bookMealCollection.find().sort({mealDate:1}).toArray()
    res.send(result)
  })


 
  // make membership normal after end of every month
  app.patch('/bazarCancel/:email',async(req,res)=>{
    const email = req.params.email
    const filter= {email: email}
    console.log(filter);
  const updatedDoc ={
  $set:{
    bazar: 'no',
    bookingDate: ''
  }
  }
  const result = await userCollection.updateOne(filter,updatedDoc)
  console.log(result);
  res.send(result)
  })

  //admin pr analytics for admin
   

app.get('/admin-stats', verifyToken,async (req, res) => {
  try {
    const usersCount = await userCollection.countDocuments({ roll: 'member' });
    const adminCount = await userCollection.countDocuments({ roll: 'admin' });

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; 

const meals = await mealCollection.find().toArray();
const payments = await paymentCollection.find().toArray()


const mealsThisMonth = meals.filter(meal => {
    const mealDate = new Date(meal.date);
    return mealDate.getMonth() + 1 === currentMonth;
});

const totalMealsThisMonth = mealsThisMonth.reduce((total, meal) => total + meal.totalMeal, 0);


const paymentsThisMonth = payments.filter(payment => {
    const paymentDate = new Date(payment.date);
    return paymentDate.getMonth() + 1 === currentMonth;
});

const totalPaymentThisMonth = paymentsThisMonth.reduce((total, payment) => total + payment.price, 0);

const mealRateThisMonth = parseFloat(totalPaymentThisMonth / totalMealsThisMonth).toFixed(3);

const breakfastThisMonth = mealsThisMonth?.filter(user =>
  user?.time?.includes("breakfast"));

const breakfastMealsThisMonth = breakfastThisMonth.reduce((total, meal) => total + meal.totalMeal, 0);
const lunchThisMonth = mealsThisMonth?.filter(user =>
  user?.time?.includes("lunch"));

const lunchMealsThisMonth = lunchThisMonth.reduce((total, meal) => total + meal.totalMeal, 0);
const dinnerThisMonth = mealsThisMonth?.filter(user =>
  user?.time?.includes("dinner"));

const dinnerMealsThisMonth = dinnerThisMonth.reduce((total, meal) => total + meal.totalMeal, 0);


    res.send({
      usersCount,
      adminCount,
      totalMealsThisMonth,
      totalPaymentThisMonth,
      mealRateThisMonth,
      breakfastMealsThisMonth,
      dinnerMealsThisMonth,
      lunchMealsThisMonth
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});






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