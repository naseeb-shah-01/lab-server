import { Router } from 'express';
import { createTestGroup } from "../../../controllers/testGroup/testGroup";

const router= Router()

router.post("/create",(req,res)=>{
    res.handle(createTestGroup,req.body)
})



export  default router