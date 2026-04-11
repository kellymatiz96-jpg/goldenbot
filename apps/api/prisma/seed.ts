import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed de GoldenBot...');

  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@goldenbot.com';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'goldenbot2024';
  const superadminName = process.env.SUPERADMIN_NAME || 'Administrador';

  // Crear superadmin si no existe
  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail },
  });

  if (!existingSuperadmin) {
    const hashedPassword = await bcrypt.hash(superadminPassword, 12);
    await prisma.user.create({
      data: {
        email: superadminEmail,
        password: hashedPassword,
        name: superadminName,
        role: 'SUPERADMIN',
        clientId: null,
      },
    });
    console.log(`✅ Superadmin creado: ${superadminEmail}`);
  } else {
    console.log(`ℹ️  Superadmin ya existe: ${superadminEmail}`);
  }

  // Crear cliente de prueba si no existe
  const testClientSlug = 'cliente-demo';
  const existingClient = await prisma.client.findUnique({ where: { slug: testClientSlug } });

  if (!existingClient) {
    const demoClient = await prisma.client.create({
      data: {
        name: 'Cliente Demo',
        slug: testClientSlug,
        plan: 'BASIC',
        maxConversationsPerMonth: 500,
      },
    });

    const hashedPassword = await bcrypt.hash('demo1234', 12);

    const demoAdmin = await prisma.user.create({
      data: {
        email: 'demo@cliente.com',
        password: hashedPassword,
        name: 'Admin Demo',
        role: 'CLIENT_ADMIN',
        clientId: demoClient.id,
      },
    });

    await prisma.aIConfig.create({
      data: {
        clientId: demoClient.id,
        chatbotProvider: 'OPENAI',
        chatbotModel: 'gpt-4o-mini',
      },
    });

    await prisma.businessInfo.create({
      data: {
        clientId: demoClient.id,
        businessName: 'Negocio Demo',
        description: 'Este es un negocio de ejemplo para probar GoldenBot',
        services: 'Servicio A, Servicio B, Servicio C',
        schedule: 'Lunes a Viernes 8am - 6pm',
        welcomeMessage: '¡Hola! Bienvenido a Negocio Demo. ¿En qué te puedo ayudar?',
        humanKeywords: ['agente', 'humano', 'persona', 'hablar con alguien'],
      },
    });

    console.log(`✅ Cliente demo creado: ${demoClient.name}`);
    console.log(`   Admin: ${demoAdmin.email} / demo1234`);
  } else {
    console.log(`ℹ️  Cliente demo ya existe`);
  }

  console.log('');
  console.log('✅ Seed completado exitosamente.');
  console.log('');
  console.log('📋 Credenciales para ingresar:');
  console.log(`   Superadmin: ${superadminEmail} / ${superadminPassword}`);
  console.log('   Cliente demo: demo@cliente.com / demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
