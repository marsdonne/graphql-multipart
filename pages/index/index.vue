<template>
	<view>
		<button @click="mpSelectImg">选择图片</button>
		<button @click="pause">暂停</button>
	</view>
</template>

<script>
	import {
		graphqlUpload as upload,
		uploadTask
	} from "@/utils/graphql-multipart.min.js"
	export default {
		methods: {
			mpSelectImg() {
				uni.chooseImage({
					count: 2,
					success: res => {
						uni.showLoading({
							title: "上传中"
						})
						upload({
							url: "http://localhost:6891/graphql",
							query: 'mutation Upload($files:[Upload!]!){operation(files:$files){id}}',
                            variables: {
                                uploadFiles: [null,null]
                            },
                            uploadKey: "uploadFiles",
							files: {
								avatar: res.tempFilePaths[0],
								img: res.tempFilePaths[1]
							},
							success(res) {
								console.log(res)
							}
						})
					}
				})
			},
			pause() {
				uploadTask.abort()
				uni.hideLoading({
					success(){
						uni.showToast({
							title: "取消成功"
						})
					}
				})
				
			}
		}
	}
</script>

<style scoped>

</style>
