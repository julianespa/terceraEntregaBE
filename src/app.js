import express from "express";
import productsRouter from './routes/products.js';
import cartRouter from './routes/carts.js'


const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/api/products',productsRouter)
app.use('/api/cart',cartRouter)

const PORT = process.env.PORT || 8080
const server = app.listen(PORT,()=>console.log(`Listening on ${PORT}`))