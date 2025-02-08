import { Router } from 'express';

import { createTest, getAllTest, getTestById, testByGroupId } from "../../../controllers/test/test";

const router= Router()

router.get("/all",(req,res)=>{
    res.handle(getAllTest)
})
router.post("/create",(req,res)=>{
    res.handle(createTest,req.body)
})
router.get("/:id",(req,res)=>{
    res.handle(getTestById,req.params.id)
})
router.get("/group/:id",(req,res)=>{
    res.handle(testByGroupId,req.params.id)
})



export  default router