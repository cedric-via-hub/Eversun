import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/lib/userModel';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    await connectToDatabase();
    const user = await User.findById(decoded.userId).select('email role');
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}