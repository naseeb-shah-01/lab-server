import { Router } from 'express';


import { createLab, getLab, updateLab } from "../../../controllers/lab";

const router= Router()


router.post("/create",(req,res)=>{
    res.handle(createLab,req.body)
})
router.get("/update",(req,res)=>{
    res.handle(updateLab,req.body)
})
router.get("/:id",(req,res)=>{
    res.handle(getLab,req.params.id)
})




export  default router