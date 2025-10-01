import json
import mysql.connector
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
load_dotenv(dotenv_path)

db_config = {
    'host': 'localhost',
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': 'vithenics'
}

def clear_tables(cursor):
    print('Clearing existing data from tables...')

    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
    tables_to_clear = ['exercises', 'skills', 'workouts', 'progressions', 'achievements', 'user_achievements', 'workout_history', 'user_progress']

    for table in tables_to_clear:
        try:
            cursor.execute(f'TRUNCATE TABLE {table};')

            print(f'Table \'{table}\' cleared.')
        except mysql.connector.Error as err:
            print(f'Failed to clear table {table}: {err}')

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')

    print('Tables cleared successfully.')

def load_data(cursor, file_path, table_name, columns, data_mapper, root_key):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f'Loading data into \'{table_name}\' from \'{file_path}\'...')
        
        if root_key not in data:
            print(f'Error: Root key \'{root_key}\' not found in {file_path}. Skipping file.')

            return

        items_to_process = data[root_key]

        if not isinstance(items_to_process, list):
            print(f'Error: Data under root key \'{root_key}\' in {file_path} is not a list. Skipping file.')

            return
            
        insert_query = f'INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(columns))})'
        
        records_to_insert = []

        for item in items_to_process:
            if isinstance(item, dict):
                records_to_insert.append(data_mapper(item))

            else:
                print(f'Warning: Found a non-dictionary item in {file_path}, skipping: {item}')
            
        if records_to_insert:
            cursor.executemany(insert_query, records_to_insert)

            print(f'{cursor.rowcount} records inserted into \'{table_name}\'.')

        else:
            print(f'No valid records found to insert for \'{table_name}\'.')

    except FileNotFoundError:
        print(f'Error: File not found at {file_path}')
    except json.JSONDecodeError:
        print(f'Error: Could not decode JSON from {file_path}')
    except mysql.connector.Error as err:
        print(f'Error inserting data into {table_name}: {err}')
    except Exception as e:
        print(f'An unexpected error occurred with {file_path}: {e}')


conn = None

try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    print('Successfully connected to the database.')

    clear_tables(cursor)

    load_data(
        cursor, 'exerciseList.json', 'exercises',
        ['name', 'description', 'muscle_groups', 'difficulty_level', 'instructions'],
        lambda item: (
            item.get('name'),
            item.get('description'),
            json.dumps(item.get('musclesIcons', [])),
            item.get('difficulty'),
            item.get('techniqueSummary', '')
        ),
        root_key='list'
    )

    load_data(
        cursor, 'data/skillList.json', 'skills',
        ['name', 'description', 'progressions'],
        lambda item: (
            item.get('name'),
            item.get('description'),
            json.dumps(item.get('progressions', []))
        ),
        root_key='skillList'
    )

    load_data(
        cursor, 'data/routineList.json', 'workouts',
        ['name', 'description', 'workout_type', 'difficulty_level', 'progressions'],
        lambda item: (
            item.get('name'),
            item.get('description'),
            item.get('workoutFocus'),
            item.get('difficulty'),
            json.dumps(item.get('progressions', []))
        ),
        root_key='skillList'
    )

    load_data(
        cursor, 'data/basicProgressions.json', 'progressions',
        ['name', 'progressions'],
        lambda item: (
            item.get('name'), json.dumps(item.get('progressions', []))
        ),
        root_key='list'
    )

    load_data(
        cursor, 'data/achievementsList.json', 'achievements',
        ['name', 'description', 'criteria_type', 'criteria_value', 'icon', 'category'],
        lambda item: (
            item.get('name'),
            item.get('description'),
            item.get('criteria_type'),
            item.get('criteria_value'),
            item.get('icon'),
            item.get('category')
        ),
        root_key='achievements'
    )

    conn.commit()

    print('\nAll data loaded successfully!')

except mysql.connector.Error as err:
    print(f'Database connection error: {err}')
finally:
    if conn and conn.is_connected():
        cursor.close()
        conn.close()

        print('Database connection closed.')
