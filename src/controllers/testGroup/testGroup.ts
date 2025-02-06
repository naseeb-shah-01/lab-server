import { throwError } from "../../helpers/throw-errors";
import { IGroup } from "../../models/general/testGroup";
import { model } from 'mongoose';

const Group= model<IGroup>('Group');

export const  createTestGroup =async(data:IGroup)=>{

 try{

 if(!data.type||!data.name||!data.note){
     throwError(400,"Please provide All details related to test group . Type ,Name and Note")
 }
    let group = await Group.create(data)
    return group 

 }catch{
    throwError(500)
 }

}