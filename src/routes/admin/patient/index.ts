import { Router } from 'express';



import { createPatient, getPatient, updatePatient } from "../../../controllers/patient";

const router= Router()


router.post("/create",(req,res)=>{
    res.handle(createPatient,req.body)
})
router.get("/update",(req,res)=>{
    res.handle(updatePatient,req.body)
})
router.get("/:id",(req,res)=>{
    res.handle(getPatient,req.params.id)
})




export  default router