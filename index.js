const express = require('express')
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express()
// const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json()); 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lx750.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
    try {
      await client.connect();
      const database = client.db("partsix");
       const hospitaldoctorsCollection = database.collection("hospitaldoctors");
       const partscollection = database.collection("parts");
    //    const specialcollection = database.collection("special");
        const hospitaldoctorsbookingCollection = database.collection("hospitaldoctorsbooking");

         const userCollection = database.collection("user");
         const paymentCollection = database.collection("payments");
    //      const reviewCollection = database.collection("reviews");
   

      // GET API FOR SHOWING ALL clocks
app.get('/hospitaldoctors', async(req, res) => {
    const cursor = hospitaldoctorsCollection.find({});
    const parts = await cursor.toArray();
    res.send(parts);
})

app.get('/parts', async(req, res) => {
    const cursor = partscollection.find({});
    const parts = await cursor.toArray();
    res.send(parts);
})
app.get('/user', verifyJWT, async (req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
});
  


// GET API FOR my BOOKED ROOMS & all booked rooms
app.get('/hospitaldoctorsbooking', verifyJWT, async(req, res) => {
  let query = {};
  const patient = req.query.patient;
  const authorization = req.headers.authorization;
  console.log('auth header',authorization);
if(patient){
  query = {patient: patient};
}
    const cursor = hospitaldoctorsbookingCollection.find(query);
    const room = await cursor.toArray();
    res.send(room);
})


app.get('/available', async(req,res) => {
  const hospitaldoctorsCollection = client.db(process.env.DB).collection('hospitaldoctors');
   
  const date = req.query.date || 'Oct 26, 2022';
  // step 1 
  const services = await hospitaldoctorsCollection.find().toArray();
  // step 2 
  const hospitaldoctorsbookingCollection = client.db(process.env.DB).collection('hospitaldoctorsbooking');
  const query = {date:date};
  const bookings = await hospitaldoctorsbookingCollection.find(query).toArray();
  // step 3 
  services.forEach(service =>{
    const servicebookings = bookings.filter(b=>b.treatment === service.name);
    const booked = servicebookings.map(s=> s.slot);
    const available = service.slots.filter(s=>!booked.includes(s));
    service.available = available;
    // service.booked = booked;

  })
  res.send(services);
})

app.get('/booking/:id',  async(req,res)=>{
  const id = req.params.id;
  const query= {_id:ObjectId(id)};
  const booking = await bookingcollection.findOne(query);
  res.send(booking);
})

app.delete('/hospitaldoctorsbooking/:id', async(req,res) => {
  const id = req.params.id;
  const query = {_id:ObjectId(id)};
  const result = await hospitaldoctorsbookingCollection.deleteOne(query);
  res.send(result);
  })

  

  app.patch('/hospitaldoctorsbooking/:id', async(req,res)=>{
    const id = req.params.id;
    const payment = req.body;
    const filter = {_id:ObjectId(id)};
    const updatedDoc = {
        $set:{
          paid:true,
          transactionId:payment.transactionId
        }
    }
    const result = await paymentCollection.insertOne(payment);
    const updatedbooking = await hospitaldoctorsbookingCollection.updateOne(filter,updatedDoc);
    res.send(updatedDoc);
})
  app.put('/hospitaldoctorsbooking/:id', async(req,res)=>{
    const id = req.params.id;
    const updated = req.body;
    const filter = {_id:ObjectId(id)};
    const options = {upsert:true};
    const updatedDoc = {
        $set:updated
    }
    const result = await hospitaldoctorsbookingCollection.updateOne(filter,updatedDoc,options);
    res.send(result);
})


app.post('/hospitaldoctorsbooking',verifyJWT, async(req, res) => {
  const booking = req.body;
  console.log(booking);
  const query={treatment:booking.treatment,date:booking.date, patient:booking.patient};
  const exists = await hospitaldoctorsbookingCollection.findOne(query);
  if(exists){
      return res.send({success:false,booking:exists});
  }
  const result = await hospitaldoctorsbookingCollection.insertOne(booking);
 return res.send({success:true,result});
});

app.post('/create-payment-intent', verifyJWT, async(req,res)=>{
  const service = req.body;
  const price = service.price;
  const amount = price * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types:["card"]
    
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
})

// GET API FOR SHOWING INDIVIDUAL ROOM DETAILS 
app.get('/parts/:id', async(req,res)=>{
  const id = req.params.id;
  const query = {_id:ObjectId(id)};
  const hotel = await partscollection.findOne(query);
  res.json(hotel);

})
app.get('/hospitaldoctors/:id', async(req,res)=>{
  const id = req.params.id;
  const query = {_id:ObjectId(id)};
  const hotel = await hospitaldoctorsCollection.findOne(query);
  res.json(hotel);

})




// //   POST API TO ADD clock 
app.post('/parts', async(req, res) => {
    const newtool = req.body; 
    const result = await partscollection.insertOne(newtool);
    console.log('hitting the post',req.body);
    console.log('added hotel', result)
    res.json(result);
          
  })

app.post('/hospitaldoctors', async(req, res) => {
    const newtool = req.body; 
    const result = await hospitaldoctorsCollection.insertOne(newtool);
    console.log('hitting the post',req.body);
    console.log('added hotel', result)
    res.json(result);
          
  })



  // POST API TO ADD BOOKING OF ANY ROOM 
app.post('/booking', async(req, res) => {
  const newroom = req.body; 
  const result = await bookingcollection.insertOne(newroom);
  console.log('hitting the post',req.body);      
  res.json(result);
        
}) 

app.put('/user/:email',  async (req, res) => {
  const email = req.params.email;
  const user = req.body;
  const filter = { email: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: user,
  };
  const result = await userCollection.updateOne(filter, updateDoc, options);
 const token = jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '30d' })
  res.send({ result,token });
})

//        // post api for posting reviews 
// app.post('/reviews', async(req,res)=>{
//   const review = req.body;
//   console.log('hit the post api',review);

//   const result = await reviewCollection.insertOne(review);
//    res.json(result)

// }); 
      

app.get('/admin/:email', verifyJWT, async(req, res) =>{
  const email = req.params.email;
  const user = await userCollection.findOne({email: email});
  const isAdmin = user.role === 'admin';
  res.send({admin: isAdmin})
})


// // make an user admin 
app.put('/user/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  const requester = req.decoded.email;
  const requesterAccount = await userCollection.findOne({ email: requester });
  if (requesterAccount.role === 'admin') {
    const filter = { email: email };
    const updateDoc = {
      $set: { role: 'admin' },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  }
  else{
    res.status(403).send({message: 'forbidden'});
  }

})

// payment gateway 
// app.post('/create-payment-intent', async (req, res) => {
//   const paymentInfo = req.body;
// const amount = paymentInfo.price*100;
//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: amount,
//     currency: 'usd',
//     payment_method_types: ['card']
//   });

//   res.json({clientSecret: paymentIntent.client_secret});
// });

    } 
    finally {
      
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})