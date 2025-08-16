import { Redis } from '@upstash/redis';

export async function getRedis(){
  const redis = Redis.fromEnv();
  return redis
}