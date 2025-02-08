import { Router } from 'express';
import { createDoctor, getDoctor, updateDoctor } from "../../../controllers/doctor";




const router= Router()


router.post("/create",(req,res)=>{
    res.handle(createDoctor,req.body)
})
router.get("/update",(req,res)=>{
    res.handle(updateDoctor,req.body)
})
router.get("/:id",(req,res)=>{
    res.handle(getDoctor,req.params.id)
})




export  default router