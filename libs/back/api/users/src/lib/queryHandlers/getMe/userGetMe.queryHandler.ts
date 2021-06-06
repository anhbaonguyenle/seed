import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDTO, UserGetMeQuery, PrismaService } from '@seed/back/api/shared';

@QueryHandler(UserGetMeQuery)
export class UserGetMeQueryHandler implements IQueryHandler<UserGetMeQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: UserGetMeQuery): Promise<UserDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: query.id,
      },
    });
    if (!user) {
      return null;
    }
    return user;
  }
}
