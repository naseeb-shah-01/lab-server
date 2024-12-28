import { Router } from 'express';
import { getParentCategory, getSubCategoryByLevel, sellerByMainCategory } from '../../../controllers/buyer/buyer';
import { getAvailableCategory } from "../../../controllers/buyer/product";

const router = Router();

router.get('/parent', (req, res) => {
  res.handle(getParentCategory, req.getUser());
});

router.get('/level/:level/parent/:parent', (req, res) => {
  res.handle(getSubCategoryByLevel, [req.params.level, req.params.parent, req.getUser()]);
});
router.post('/available-category',(req,res)=>{
    res.handle(getAvailableCategory,[req.query,req.body])
})

router.post('/sellersbylevelonecategory',(req,res)=>{
    res.handle(sellerByMainCategory,[req.query,req.body])
})
export default router;
