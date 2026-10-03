export type RegistrationFiles = { userId:string; createdAt:number; photo:File|null; horoscope:File|null };
function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('gokul-registration-files',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'userId'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('Your browser could not save the selected files. Upload them after signing in.'));
  });
}
export async function saveRegistrationFiles(files:RegistrationFiles) {
  const db=await database();
  return new Promise<void>((resolve,reject)=>{
    const transaction=db.transaction('files','readwrite');
    if(files.photo || files.horoscope) transaction.objectStore('files').put(files);
    else transaction.objectStore('files').delete(files.userId);
    transaction.oncomplete=()=>{db.close();resolve();};
    transaction.onerror=()=>{db.close();reject(new Error('Selected files could not be saved. Please select them again after login.'));};
    transaction.onabort=()=>{db.close();reject(new Error('Selected files could not be saved. Please select them again after login.'));};
  });
}
export async function getRegistrationFiles(userId:string):Promise<RegistrationFiles|null> {
  const db=await database();
  const files=await new Promise<RegistrationFiles|null>((resolve,reject)=>{
    const request=db.transaction('files').objectStore('files').get(userId);
    request.onsuccess=()=>{db.close();resolve(request.result||null);};
    request.onerror=()=>{db.close();reject(new Error('Could not restore selected files.'));};
  });
  if(files && Date.now()-files.createdAt>24*60*60*1000) {await saveRegistrationFiles({...files,photo:null,horoscope:null});return null;}
  return files;
}
