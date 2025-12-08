import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { RegisterUserDto } from '../../user/dto/register-user.dto';
import { LoginUserDto } from '../../user/dto/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    validateUser: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterUserDto = {
        phone: '2348012345678',
        pin: '1234',
        displayName: 'Test User',
      };

      const result = { id: '1', phone: '2348012345678' };
      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(registerDto)).toEqual(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      const loginDto: LoginUserDto = {
        phone: '2348012345678',
        pin: '1234',
      };

      const user = { id: '1', phone: '2348012345678' };
      const result = { token: 'jwt-token', user };

      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(loginDto)).toEqual(result);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.phone,
        loginDto.pin,
      );
    });

    it('should return error for invalid credentials', async () => {
      const loginDto: LoginUserDto = {
        phone: '2348012345678',
        pin: '0000',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      expect(await controller.login(loginDto)).toEqual({
        error: 'Invalid credentials',
      });
    });
  });
});
