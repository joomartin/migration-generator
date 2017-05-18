function TypeMapper() {

}

/**
 * @param nativeType String
 */
TypeMapper.prototype.map = function (nativeType) {
    throw Error('Abstract method. Must be implemented');
}

module.exports = TypeMapper;