import asyncio
from jose import jwt
from app.config import settings
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import User
from app.utils.security import create_access_token, get_current_user

async def test():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.username == 'testuser2'))
        u = r.scalar_one_or_none()
        if not u:
            print("User not found")
            return
        
        print(f"User id={u.id}, type={type(u.id)}")
        token = create_access_token({"sub": u.id})
        print(f"Token: {token[:40]}...")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(f"Payload: {payload}")
        print(f"sub value: {payload.get('sub')}, type: {type(payload.get('sub'))}")
        
        # Check if the user can be found with this sub
        user_id = payload.get("sub")
        r2 = await db.execute(select(User).where(User.id == user_id))
        u2 = r2.scalar_one_or_none()
        print(f"User lookup by id={user_id}: {'FOUND' if u2 else 'NOT FOUND'}")

asyncio.run(test())
