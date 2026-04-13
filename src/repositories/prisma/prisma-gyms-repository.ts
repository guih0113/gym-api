import { Gym, Prisma } from 'generated/prisma'
import { FindManyNearbyParams, GymsRepository } from '../gyms-repository'
import { prisma } from '@/lib/prisma'
import { getDistanceBetweenCoordinates } from '@/utils/get-distance-between-coordinates'

export class PrismaGymsRepository implements GymsRepository {
  async searchMany(query: string, page: number) {
    const gyms = await prisma.gym.findMany({
      where: {
        title: {
          contains: query
        }
      },
      take: 20,
      skip: (page - 1) * 20
    })

    return gyms
  }

  async findById(id: string) {
    const gym = await prisma.gym.findUnique({
      where:{
        id
      }
    })

    return gym
  }

  async findManyNearby({ latitude, longitude }: FindManyNearbyParams) {
    const gyms = await prisma.gym.findMany()

    return gyms.filter((gym) => {
      const distance = getDistanceBetweenCoordinates(
        { latitude, longitude },
        { latitude: gym.latitude.toNumber(), longitude: gym.longitude.toNumber() }
      )

      return distance < 10
    })
  }

  async create(data: Prisma.GymCreateInput) {
    const gym = await prisma.gym.create({
      data
    })

    return gym
  }
}
