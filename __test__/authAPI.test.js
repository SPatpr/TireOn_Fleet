import { signUpNewCompany } from '../api/authAPI';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('signUpNewCompany', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Sikeres regisztráció esetén visszaadja a usert és meghívja a táblákat', async () => {
    
    const mockUser = { id: 'user-123', email: 'teszt@ceg.hu' };
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockCompany = { id: 15, official_name: 'Teszt Kft.' };

    const singleMock = jest.fn().mockResolvedValue({ data: mockCompany, error: null });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    const insertMock = jest.fn(() => ({ select: selectMock }));
    
    supabase.from.mockImplementation((table) => {
      if (table === 'companies') {
        return { insert: insertMock };
      }
      if (table === 'profiles') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: jest.fn() };
    });

    const inputData = {
      email: 'teszt@ceg.hu',
      password: 'password123',
      fullName: 'Nagy Tesztelő',
      companyName: 'Teszt Kft.',
      taxId: '12345678'
    };

    const result = await signUpNewCompany(inputData);

    expect(result).toEqual(mockUser);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'teszt@ceg.hu',
      password: 'password123',
    });

    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ 
        official_name: 'Teszt Kft.',
        tax_id: '12345678'
      })
    ]);
  });

  it('Hiba esetén dobjon hibát (pl. ha már létezik az email)', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    });

    await expect(signUpNewCompany({
      email: 'letezo@email.com',
      password: 'pass'
    })).rejects.toThrow('User already registered');
  });
});