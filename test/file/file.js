const file = require('../../file/file');
const expect = require('chai').expect;

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
});