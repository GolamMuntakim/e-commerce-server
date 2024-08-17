require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
const app = express()
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
// middleware
const verifyToken = (req, res, next)=>{
    const token = req.cookies?.token
    if(!token){
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
            if(err){
                return res.status(401).send({message: 'unauthorized access'})
            }
            console.log(decoded)
            req.user = decoded
            next()
        })
    }
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajfjwu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const productCollection = client.db('e-commerce').collection('product')
   app.post ('/jwt', async(req,res)=>{
    const user = req.body
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "1d",
    })
    res.cookie('token', token,
        {
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        }
    ).send({success : true})
   })
   app.get('/logout', (req,res)=>{
    res.clearCookie('token',{maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite : process.env.NODE_ENV === 'production' ? 'none' : 'strict'
    }).send({success:true})
   })
//    save the product data in database 
app.post('/product', async(req,res)=>{
    const data = req.body
    const result = await productCollection.insertOne(data)
    res.send(result)
})
// get the product
app.get('/allproduct', async (req, res) => {
    const search = req.query.search || '';
    const filter = req.query.filter
    const brandfilter = req.query.brandfilter
    const size = parseInt(req.query.size)
    const page = parseInt(req.query.page) -1
    const query = {
        name: { $regex: search, $options: 'i' }
    };
    // console.log(search)
    if(filter) query.category = filter
    if(brandfilter) query.brand = brandfilter
    const result = await productCollection.find(query).skip(page*size).limit(size).toArray();
    res.send(result);
})

app.get('/product-count', async(req,res)=>{
    const { search, filter,brandfilter } = req.query;
        try {
            let query = {};
            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }
            if (filter) {
                query.category = filter;
            }
            if (brandfilter) {
                query.brand = brandfilter;
            }
            const count = await productCollection.countDocuments(query);
            res.json({ count });
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
 })


// delete product
app.delete('/deleteproduct/:id',async(req,res)=>{
    const id = req.params.id
    const query ={ _id:new ObjectId(id)}
    const result = await productCollection.deleteOne(query)
    res.send(result)
})
  } finally {
    
  }
}
run().catch(console.dir);
app.get('/',(req,res)=>{
    res.send('hello')
})
app.listen(port,()=>console.log(`server running on port ${port}`))
