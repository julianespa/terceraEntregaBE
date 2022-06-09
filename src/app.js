import express from "express";
import productsRouter from './routes/products.js';
import cartRouter from './routes/carts.js'
import {dirname} from 'path'
import { fileURLToPath } from "url";
import session from 'express-session'
import bcrypt from 'bcrypt'
import passport from 'passport'
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "./manager/mongo/models/users.js";
import dotenv from 'dotenv'
import { uploader } from "./services/uploader.js";
import { Server } from "socket.io";
import { productServices } from "./DAOs/daos.js";
import { cartServices } from "./DAOs/daos.js";
import { createTransport } from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config()

const TEST_MAIL = process.env.TEST_MAIL

const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: TEST_MAIL,
        pass: process.env.MAIL_PASS
    }
})



const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(express.static(__dirname+'/public'))


app.set('views', __dirname+'/views')
app.set('view engine', 'ejs')

// SESSION
app.use(session({
    secret: process.env.SECRET,
    resave:true,
    saveUninitialized:true,
    cookie:{
        expires: 500000
    }
}))
// IMPLEMENTACION PASSPORT
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user,done)=>{return done(null,user)})
passport.deserializeUser((id,done)=>{
    User.findById(id,(err,user)=>{
        return done(err,user.id)
    })
})

const createHash = (password) => {
    return bcrypt.hashSync(
        password,
        bcrypt.genSaltSync(10)
        )
    }
    
    const isUserLogged = (req,res,next)=> {
        if(req.isAuthenticated()) return next()
        res.redirect('/')
    }
    
passport.use('signupStrategy', new LocalStrategy({passReqToCallback:true},
    (req, username, password, done)=>{
        User.findOne({username:username},(err,user)=>{
            if(err) return done(err)
            if(user) return done(null,false,{message:'user already register'})
            
            const newUser = {
                username: username,
                password: createHash(password),
                name: req.body.name,
                address: req.body.address,
                file: req.protocol+"://"+req.hostname+":"+PORT+"/img/"+req.file.filename || 'no file',
                age: req.body.age,
                phone: req.body.phone,
                isAdmin: req.body.isAdmin || false
            }
            
            User.create(newUser,(err,userCreated)=>{
                if(err) return done(err)
                return done(null,userCreated)
            })
        })
    }
))

passport.use('loginStrategy', new LocalStrategy(
    (username, password, done)=>{
        User.findOne({username:username},(err,userFound)=>{
            if(err) return done(err)
            if(!userFound) return done(null,false,{message:'user dont exist'})
            if(!bcrypt.compareSync(password,userFound.password)) return done(null,false,{message:'invalid password'})
            return done(null,userFound)
        })
    }
))
    
// ------------------------------------------

app.use('/api/products',productsRouter)
app.use('/api/cart',cartRouter)

app.get('/',(req,res)=>{
    if(req.isAuthenticated()) return res.redirect('http://localhost:8080/api/products')
    res.render('login')
})

app.get('/signup',(req,res)=>{
    if(req.isAuthenticated()) return res.redirect('/api/products')
    res.render('signup')
})

app.post('/signup',uploader.single('file'),passport.authenticate('signupStrategy',{
    failureRedirect: '/signup',
}),async (req,res)=>{

    const mailOptions = {
        from: 'servidor de node js',
        to: TEST_MAIL,
        subject: 'nuevo usuario registrado',
        html: `nuevo usuario
                nombre:${req.body.name}
                email: ${req.body.username}`
    }

    
    try {
        const info = await transporter.sendMail(mailOptions)
        console.log(info)
    } catch (err) {
    console.log(err)        
    }

    res.redirect('/api/products')    
})

app.post('/login',uploader.single('file'),passport.authenticate('loginStrategy',{
    failureRedirect: '/',
}),(req,res)=>{
    res.redirect('/api/products')
    console.log(req.body)
})

app.get('/logout',(req,res,next)=>{
    if(req.isAuthenticated()) {
        req.logout((err)=>{if(err) return next(err)})
    }
    res.redirect('/')
})

app.get('/req',(req,res)=>{
    res.json(req.session.passport.user)
})


const server = app.listen(PORT,()=>console.log(`Listening on ${PORT}`))
const io = new Server(server)


io.on('connection', async socket=>{
    console.log('new user')

    let products = await productServices.get()
    io.emit('products',products)

    socket.on('createCart', async data=>{
        let newCart = await cartServices.new()
        let cartID = newCart.payload[0]._id
        io.emit('cartCreated',{cart:newCart})
        socket.on('addProductToCart', async idProd=>{
            await cartServices.add(cartID,idProd)
            let cart = await cartServices.get(cartID)
            let prodInCartIds = cart.payload[0].products
            
            let prodInCart = []
            socket.emit('refreshCart',prodInCartIds)
            for (let i = 0; i < prodInCartIds.length; i++) {
                const id = prodInCartIds[i];
                let product = await productServices.getById(id)
                
                prodInCart.push(product.payload[0])
                product = []
            }
            
            socket.emit('refreshCart',prodInCart)
        })
        socket.on('finishPurchase',async data=>{
            console.log(data)

            let articulosPedido = ''
            for (let i = 0; i < data.length-1; i++) {
                const articulo = data[i];
                articulosPedido = articulosPedido+`<ul><li>name: ${articulo.name}</li><li>price: ${articulo.price}</li><li>id: ${articulo.id}</li></ul><br>`
            }


            const mailOptions2 = {
                from: 'servidor de node js',
                to: TEST_MAIL,
                subject: `nuevo pedido de ${data[data.length-1].user} , email ${data[data.length-1].email} `,
                html: `lista de pedido:<br> ${articulosPedido}`
            }
        
            
            try {
                const info = await transporter.sendMail(mailOptions2)
                console.log(info)
            } catch (err) {
            console.log(err)        
            }

            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                await cartServices.deleteProd(cartID,element.id)
            }
        })
    })

})