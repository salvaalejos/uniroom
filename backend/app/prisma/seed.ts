import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seeding (lo que sea que eso signifique, anda plantando XD)')

  const servicios = [
    "WiFi", "Agua", "Luz", "Gas", "Lavadora", "Estacionamiento", "Amueblado"
  ]

  const reglas = [
    "No mascotas", "No fumar", "No fiestas", "Solo estudiantes", "No visitas"
  ]

  console.log('Creando servicios...')
  for (const nombre of servicios) {
    await prisma.servicios.upsert({
      where: { id_servicios: servicios.indexOf(nombre) + 1 },
      update: {},
      create: {
        id_servicios: servicios.indexOf(nombre) + 1,
        nombre
      }
    })
  }

  console.log('Creando restricciones...')
  for (const nombre of reglas) {
    await prisma.restricciones.upsert({
      where: { id_restriccion: reglas.indexOf(nombre) + 1 },
      update: {},
      create: {
        id_restriccion: reglas.indexOf(nombre) + 1,
        nombre
      }
    })
  }

  console.log('✅ Seeding completado con éxito.')
}

main()
  .catch((e) => {
    console.error('Error durante el seeding, por cada error de ejecución, un router CISCO muere :C ', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
