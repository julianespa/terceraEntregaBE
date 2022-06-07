import mongoose from "mongoose";

const URL = 'mongodb+srv://julian:coder123@clasecoderatlas.strau.mongodb.net/DBusers?retryWrites=true&w=majority'

export const mongoConfig = mongoose.connect(URL,{useNewUrlParser:true,useUnifiedTopology:true},(err)=>{
    if(err) return console.log(err)
    console.log('connected to DB')
})

