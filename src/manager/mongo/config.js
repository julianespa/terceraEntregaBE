import mongoose from "mongoose";

const URL = 'mongodb://127.0.0.1:27017/dbEspasandin'

export const mongoConfig = mongoose.connect(URL,{useNewUrlParser:true,useUnifiedTopology:true})

