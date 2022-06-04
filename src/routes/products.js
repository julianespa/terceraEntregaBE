import express from "express";
import { productServices } from "../DAOs/daos.js";

const router = express.Router();

const productService = productServices

let admin = true

const middleWare = (req,res,next) => {
    admin ? next() : res.send({status:'error',message:'only available as admin'})
}

router.get('/',(req,res)=>{
    productService.get()
    .then(r=>res.send(r))
})

router.post('/',middleWare,(req,res)=>{
    let product = req.body
    productService.add(product)
    .then(r=>res.send(r))
})

router.get('/:id',(req,res)=>{
    let id = req.params.id
    productService.getById(id)
    .then(r=>res.send(r))
})

router.put('/:id',middleWare,(req,res)=>{
    let id = req.params.id
    let updatedProduct = req.body
    productService.update(id,updatedProduct)
    .then(r=>res.send(r))
})

router.delete('/:id',middleWare,(req,res)=>{
    let id = req.params.id
    productService.delete(id)
    .then(r=>res.send(r))
})

export default router