import { Controller, Get, Post, Body, Param, Delete, Put, Req, Query } from '@nestjs/common';
import { Request } from 'express';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: any) {}

  // GET /posts - List posts for current tenant
  @Get()
  async getPosts(@Req() req: Request, @Query() query: any) {
    // Automatically filtered by tenantId from middleware
    return this.postsService.findMany({
      where: { 
        tenantId: req.tenantId,
        // Additional filters from query params
        ...query
      },
      include: {
        user: { select: { name: true, email: true } },
        publishes: true
      }
    });
  }

  // POST /posts - Create post for current tenant
  @Post()
  async createPost(@Body() createPostDto: any, @Req() req: Request) {
    return this.postsService.create({
      ...createPostDto,
      tenantId: req.tenantId, // Automatically inject tenantId
      userId: req.user?.id // From auth middleware
    });
  }

  // GET /posts/:id - Get single post (tenant-isolated)
  @Get(':id')
  async getPost(@Param('id') id: string, @Req() req: Request) {
    return this.postsService.findUnique({
      where: { 
        id,
        tenantId: req.tenantId // Ensure tenant isolation
      },
      include: {
        user: { select: { name: true, email: true } },
        publishes: true
      }
    });
  }

  // PUT /posts/:id - Update post (tenant-isolated)
  @Put(':id')
  async updatePost(@Param('id') id: string, @Body() updatePostDto: any, @Req() req: Request) {
    // First verify post belongs to current tenant
    const existingPost = await this.postsService.findUnique({
      where: { id, tenantId: req.tenantId }
    });

    if (!existingPost) {
      throw new Error('Post not found or access denied');
    }

    return this.postsService.update({
      where: { id },
      data: updatePostDto
    });
  }

  // DELETE /posts/:id - Delete post (tenant-isolated)
  @Delete(':id')
  async deletePost(@Param('id') id: string, @Req() req: Request) {
    // First verify post belongs to current tenant
    const existingPost = await this.postsService.findUnique({
      where: { id, tenantId: req.tenantId }
    });

    if (!existingPost) {
      throw new Error('Post not found or access denied');
    }

    return this.postsService.delete({
      where: { id }
    });
  }
}
