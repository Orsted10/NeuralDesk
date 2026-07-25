import { config } from 'dotenv';
config({path: '.env.local'});
import { queryBrain } from './src/lib/brain/embedding-pipeline';

queryBrain('whens the demonstration with MD').then(data => {
  console.log("RAG Results:");
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
