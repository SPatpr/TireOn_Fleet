import { signUpNewCompany } from '../api/authAPI';
import { supabase } from '../lib/supabase';

// Itt mondjuk meg a Jest-nek: "Bárhol látod a '../lib/supabase' importot,
// NE az igazit használd, hanem ezt a hamisítványt!"
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(), // Figyeljük, hányszor hívják meg a regisztrációt
    },
    from: jest.fn(), // Ez a trükkös rész: az adatbázis láncolt hívásaihoz
  },
}));

// A TESZTEK CSOPORTJA
describe('signUpNewCompany', () => {
  
  // Minden egyes teszt töröljük a memóriát, hogy az előző teszt ne zavarja a következőt.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. TESZT ESET: SIKERES REGISZTRÁCIÓ
  it('Sikeres regisztráció esetén visszaadja a usert és meghívja a táblákat', async () => {
    
    // A) ELŐKÉSZÜLET (ARRANGE) - Megírjuk a forgatókönyvet a dublőröknek
    
    // 1. Hazudjuk azt, hogy az Auth sikeres volt, és visszaadott egy usert:
    const mockUser = { id: 'user-123', email: 'teszt@ceg.hu' };
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // 2. Hazudjuk azt, hogy az Adatbázis (cégek) létrehozása sikeres volt:
    const mockCompany = { id: 15, official_name: 'Teszt Kft.' };

    // Itt építjük fel visszafelé a láncot: .single() -> .select() -> .insert()
    const singleMock = jest.fn().mockResolvedValue({ data: mockCompany, error: null });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    const insertMock = jest.fn(() => ({ select: selectMock }));
    
    // Itt tanítjuk be a fő belépési pontot (.from)
    supabase.from.mockImplementation((table) => {
      if (table === 'companies') {
        return { insert: insertMock }; // Ha cégeket mentünk, adja vissza a fenti láncot
      }
      if (table === 'profiles') {
        // Ha profilt mentünk, ott is sikert hazudunk (itt nem kell visszatérő adat)
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: jest.fn() };
    });

    // B) CSELEKVÉS (ACT) - Lefuttatjuk a valódi függvényt
    const inputData = {
      email: 'teszt@ceg.hu',
      password: 'password123',
      fullName: 'Nagy Tesztelő',
      companyName: 'Teszt Kft.',
      taxId: '12345678'
    };

    // Ez a lényeg! Itt hívjuk meg a te kódodat:
    const result = await signUpNewCompany(inputData);

    // C) ELLENŐRZÉS (ASSERT) - Megnézzük, mi történt

    // 1. Jó adatot kaptunk vissza?
    expect(result).toEqual(mockUser);

    // 2. A kódod tényleg megpróbált regisztrálni a Supabase-nél?
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'teszt@ceg.hu',
      password: 'password123',
    });

    // 3. A kódod tényleg beírta az adatokat a 'companies' táblába?
    // Az expect.objectContaining segít, hogy ne kelljen minden mezőt felsorolni, csak a fontosakat.
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ 
        official_name: 'Teszt Kft.',
        tax_id: '12345678'
      })
    ]);
  });

  // --- 2. TESZT ESET: HIBA KEZELÉSE ---
  it('Hiba esetén dobjon hibát (pl. ha már létezik az email)', async () => {
    // A) ELŐKÉSZÜLET
    // Most azt hazudjuk, hogy a Supabase elutasította a kérést:
    supabase.auth.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' }, // Szimulált hiba
    });

    // B) & C) CSELEKVÉS ÉS ELLENŐRZÉS EGYBEN
    // Azt várjuk, hogy a függvény "Reject"-eljen (elhasaljon) ezzel a hibaüzenettel.
    await expect(signUpNewCompany({
      email: 'letezo@email.com',
      password: 'pass'
    })).rejects.toThrow('User already registered');
  });
});