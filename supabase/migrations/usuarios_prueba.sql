-- ============================================================
-- MecSys — Usuarios de prueba
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Usuario 1: taller1@mecsys.com  / Taller123!
-- Usuario 2: taller2@mecsys.com  / Taller123!
-- ============================================================

DO $$
DECLARE
    uid1 uuid := gen_random_uuid();
    uid2 uuid := gen_random_uuid();
BEGIN

    -- ── USUARIO 1 ──────────────────────────────────────────
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uid1,
        'authenticated',
        'authenticated',
        'taller1@mecsys.com',
        crypt('Taller123!', gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Taller Uno"}',
        now(),
        now(),
        '',
        ''
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        uid1,
        jsonb_build_object('sub', uid1::text, 'email', 'taller1@mecsys.com'),
        'email',
        'taller1@mecsys.com',
        now(),
        now(),
        now()
    );

    -- ── USUARIO 2 ──────────────────────────────────────────
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uid2,
        'authenticated',
        'authenticated',
        'taller2@mecsys.com',
        crypt('Taller123!', gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Taller Dos"}',
        now(),
        now(),
        '',
        ''
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        uid2,
        jsonb_build_object('sub', uid2::text, 'email', 'taller2@mecsys.com'),
        'email',
        'taller2@mecsys.com',
        now(),
        now(),
        now()
    );

END $$;
