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


const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config()

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
        expires: 50000
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
                file: req.protocol+"://"+req.hostname+":"+PORT+"/img/"+req.file.filename,
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
}),(req,res)=>{
    console.log(req.body,req.file)
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