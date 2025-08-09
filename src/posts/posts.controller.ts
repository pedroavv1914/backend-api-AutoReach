import { Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, Query, Req, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.email, dto);
  }

  @Get()
  list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    return this.postsService.list(req.user.email, { status, from, to, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.postsService.get(req.user.email, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreatePostDto>) {
    return this.postsService.update(req.user.email, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.postsService.remove(req.user.email, id);
  }

  @Get(':id/publishes')
  publishes(@Req() req: any, @Param('id') id: string) {
    return this.postsService.publishes(req.user.email, id);
  }

  @HttpPost(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.postsService.cancel(req.user.email, id);
  }

  @HttpPost(':id/publish-now')
  publishNow(@Req() req: any, @Param('id') id: string) {
    return this.postsService.publishNow(req.user.email, id);
  }

  @HttpPost(':id/publishes/:publishId/retry')
  retry(@Req() req: any, @Param('id') id: string, @Param('publishId') publishId: string) {
    return this.postsService.retryPublish(req.user.email, id, publishId);
  }
}
