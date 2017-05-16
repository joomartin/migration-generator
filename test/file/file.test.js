const expect = require('chai').expect;

const file = require('../../file/file');

describe('File', () => {
    describe('#getClassName()', () => {
        it('should get the migration class name from a table name', () => {
            let className = file.getClassName('todos');
            expect(className).to.be.equal('CreateTodosTable');

            className = file.getClassName('todos_users');
            expect(className).to.be.equal('CreateTodosUsersTable');            

            className = file.getClassName('todos_users_categories');
            expect(className).to.be.equal('CreateTodosUsersCategoriesTable');            
        });
    });

    describe('#getVariableName()', () => {
        it('should get the migration variable name from a table name', () => {
            let className = file.getVariableName('todos');
            expect(className).to.be.equal('todos');

            className = file.getVariableName('todos_users');
            expect(className).to.be.equal('todosUsers');            

            className = file.getVariableName('todos_users_categories');
            expect(className).to.be.equal('todosUsersCategories');            
        });
    });

    describe('#generateFile()', () => {
        it('should write out content to a file', () => {
            let content = 'foo';
            let tableName = 'todos';
            let config = {
                output: '/output'
            };
            let timestamp = (new Date).getTime();
            let fs = {
                writeFileSync(path, content) {
                    expect(path).to.be.equal(`/output/${timestamp}_create_todos_table.php`);
                }
            }

            let fileName = file.generateFile(content, tableName, config, fs, timestamp);
            expect(fileName).to.be.equal(`${timestamp}_create_todos_table.php`);
        });
    });
});